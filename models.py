from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.dialects.postgresql import NUMERIC
from sqlalchemy.sql import func
from sqlalchemy import Column, String, Numeric, Text, ForeignKey, Boolean, Integer, DateTime, Float
from sqlalchemy.orm import relationship
import uuid
from sqlalchemy.dialects.postgresql import UUID

db = SQLAlchemy()

def init_db(app):
    app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:1234@localhost/INVENTARIO'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)

class Bodegas(db.Model):
    __tablename__ = 'Bodegas'
    IdBodega = Column(String(20), primary_key=True)
    Descripcion = Column(String(500), nullable=False)
    Estado = Column(Boolean, nullable=False)
    Email = Column(String(50))
    nombrepunto = Column(String(100))
    direccionpunto = Column(String(100))
    telefonopunto = Column(String(100))
    Encargado = Column(String(100))
    saldos = relationship('SaldosBodega', back_populates='bodega')

    def __repr__(self):
        return f'<Bodega {self.IdBodega}>'

class Licencia(db.Model):
    __tablename__ = 'licencia'
    id = Column(Text, primary_key=True)
    razonsocial = Column(Text, nullable=False)
    nombrecomercial = Column(Text, nullable=False)
    fecha = Column(DateTime, default=func.now())
    ubicacioncomercial = Column(Text, nullable=False)
    ciudad = Column(Text, nullable=False)
    telefono = Column(Text, nullable=False)
    version = Column(Text, nullable=False)
    numerolicencia = Column(Text, nullable=False, unique=True)
    cantidadusuario = Column(Integer, nullable=False)
    numerofacturacompra = Column(Text)
    fechacompra = Column(DateTime)
    fechavencimiento = Column(DateTime)
    nit = Column(Text, nullable=False)
    tipolicencia = Column(Text, nullable=False)

class Consecutivos(db.Model):
    __tablename__ = 'consecutivos'
    IdConsecutivo = Column(Integer, primary_key=True, autoincrement=False)
    Consecutivo = Column(String(50), nullable=False)
    Formulario = Column(String(3), nullable=False)
    Prefijo = Column(String(5), nullable=False)
    Desde = Column(String(10), nullable=False)
    Hasta = Column(String(10), nullable=False)
    Actual = Column(String(10), nullable=False)
    Resolucion = Column(String(15))
    FechaResolucion = Column(DateTime)
    ObservacionesResolucion = Column(Text)
    Estado = Column(Boolean, nullable=False, default=True)
    Comprobante = Column(String(20))
    Predeterminado = Column(Integer)
    fechafinresolucion = Column(Text)
    tiporesolucion = Column(String(20))

class Entradas1(db.Model):
    __tablename__ = 'entradas1'
    Numero = Column(String(15), primary_key=True)
    Mes = Column(String(6), nullable=False)
    Anulado = Column(Boolean, nullable=False, default=False)
    IdBodega = Column(String(20), ForeignKey('Bodegas.IdBodega'), nullable=False)
    CuentaDebito = Column(String(50))
    CuentaCredito = Column(String(50))
    Observaciones = Column(String(500))
    FechaCreacion = Column(DateTime, nullable=False)
    IdUsuario = Column(String(15), ForeignKey('Usuarios.IdUsuario'), nullable=False)
    Recibe = Column(String(50))
    IdProyecto = Column(String(50))
    fechamodificacion = Column(DateTime)
    IdConsecutivo = Column(Integer, nullable=False, default=15)
    op = Column(String(10))
    fecha = Column(DateTime)
    idcliente = Column(String(50))
    transmitido = Column(Boolean)
    subtotal = Column(Numeric(14, 2), default=0)
    total_iva = Column(Numeric(14, 2), default=0)
    total_impoconsumo = Column(Numeric(14, 2), default=0)
    total_ipc = Column(Numeric(14, 2), default=0)
    total_ibua = Column(Numeric(14, 2), default=0)
    total_icui = Column(Numeric(14, 2), default=0)
    total = Column(Numeric(14, 2), default=0)

    bodega = relationship('Bodegas', backref='entradas1')
    usuario = relationship('Usuarios', backref='entradas1')

class Entradas2(db.Model):
    __tablename__ = 'entradas2'
    ID = Column(String(50), primary_key=True)
    Numero = Column(String(15), ForeignKey('entradas1.Numero'), nullable=False)
    IdReferencia = Column(String(50), ForeignKey('referencias.IdReferencia'), nullable=False)
    Descripcion = Column(String(500), nullable=False)
    Cantidad = Column(Numeric(14, 2), nullable=False, default=0)
    Valor = Column(Numeric(14, 2), nullable=False)
    IVA = Column(Numeric(8, 2), nullable=False, default=0)
    Descuento = Column(Numeric(14, 2), nullable=False, default=0)
    remision = Column(String(15))
    idfuente = Column(String(30))
    lote = Column(Text)
    idunidad = Column(Text)
    impoconsumo = Column(Numeric(14, 2), default=0)
    ipc = Column(Numeric(14, 2), default=0)
    imp_ibua = Column(Numeric(14, 2), default=0)
    imp_icui = Column(Numeric(14, 2), default=0)

    entrada1 = relationship('Entradas1', backref='entradas2')
    referencia = relationship('Referencia', backref='entradas2')

class Salidas1(db.Model):
    __tablename__ = 'Salidas1'
    Numero = Column(String(15), primary_key=True)
    Mes = Column(String(6), nullable=True)
    Anulado = Column(Boolean, nullable=True)
    IdBodega = Column(String(20), ForeignKey('Bodegas.IdBodega'), nullable=True)
    CuentaDebito = Column(String(50), nullable=True)
    CuentaCredito = Column(String(50), nullable=True)
    Observaciones = Column(String(500))
    FechaCreacion = Column(DateTime, nullable=False, default=datetime.utcnow)
    IdUsuario = Column(String(15), ForeignKey('Usuarios.IdUsuario'), nullable=True)
    Recibe = Column(Text)
    idproyecto = Column(String(50))
    fechamodificacion = Column(DateTime)
    IdConsecutivo = Column(Integer, nullable=True, default=14)
    op = Column(DateTime)
    fecha = Column(DateTime)
    subtotal = Column(NUMERIC(14, 2), default=0)
    total = Column(NUMERIC(14, 2), default=0)
    total_iva = db.Column(db.Numeric(14, 2), default=0)
    total_impoconsumo = db.Column(db.Numeric(14, 2), default=0)
    total_ipc = db.Column(db.Numeric(14, 2), default=0)
    total_ibua = db.Column(db.Numeric(14, 2), default=0)
    total_icui = db.Column(db.Numeric(14, 2), default=0)

    bodega = relationship('Bodegas', backref='salidas1')
    usuario = relationship('Usuarios', backref='salidas1')

class Salidas2(db.Model):
    __tablename__ = 'Salidas2'
    ID = Column(String(50), primary_key=True)
    Numero = Column(String(15), ForeignKey('Salidas1.Numero'), nullable=False)
    IdReferencia = Column(String(50), ForeignKey('referencias.IdReferencia'), nullable=False)
    Descripcion = Column(String(500), nullable=False)
    Cantidad = Column(NUMERIC(14, 2), nullable=False)
    Valor = Column(NUMERIC(14, 2), nullable=False)
    lote = Column(Text)
    idunidad = Column(Text)
    IVA = db.Column(db.Numeric(14, 2), default=0)  # Añadido campo IVA
    Descuento = db.Column(db.Numeric(14, 2), default=0)
    impoconsumo = db.Column(db.Numeric(14, 2), default=0)
    ipc = db.Column(db.Numeric(14, 2), default=0)
    imp_ibua = db.Column(db.Numeric(14, 2), default=0)
    imp_icui = db.Column(db.Numeric(14, 2), default=0)

    salida1 = relationship('Salidas1', backref='salidas2')
    referencia = relationship('Referencia', backref='salidas2')

class Paises(db.Model):
    __tablename__ = 'Paises'
    IdPais = db.Column(db.String(5), primary_key=True)
    Pais = db.Column(db.String(50), nullable=False)
    Estado = db.Column(db.Boolean, nullable=False, default=True)

class Departamentos(db.Model):
    __tablename__ = 'Departamentos'
    IdDepartamento = db.Column(db.String(5), primary_key=True)
    Departamento = db.Column(db.String(200), nullable=False)
    IdPais = db.Column(db.String(5), db.ForeignKey('Paises.IdPais'), nullable=False)
    Estado = db.Column(db.Boolean, nullable=False, default=True)

class Ciudades(db.Model):
    __tablename__ = 'Ciudades'
    IdCiudad = db.Column(db.String(10), primary_key=True)
    Ciudad = db.Column(db.String(200), nullable=False)
    IdDepartamento = db.Column(db.String(5), db.ForeignKey('Departamentos.IdDepartamento'), nullable=False)
    Estado = db.Column(db.Boolean, nullable=False, default=True)
    porcreteica = db.Column(db.Numeric, nullable=True)
    idpais = db.Column(db.String(5))

class Traslados1(db.Model):
    __tablename__ = 'Traslados1'
    Numero = Column(String(15), primary_key=True)
    Mes = Column(String(6), nullable=False)
    Anulado = Column(Boolean, nullable=False)
    IdBodegaOrigen = Column(String(20), ForeignKey('Bodegas.IdBodega'), nullable=False)
    IdBodegaDestino = Column(String(20), ForeignKey('Bodegas.IdBodega'), nullable=False)
    CuentaDebito = Column(String(50))
    CuentaCredito = Column(String(50))
    Observaciones = Column(String(500))
    FechaCreacion = Column(DateTime, nullable=False)
    IdUsuario = Column(String(15), ForeignKey('Usuarios.IdUsuario'), nullable=False)
    fechamodificacion = Column(DateTime)
    IdCentroCosto = Column(String(10))
    IdConsecutivo = Column(Integer, nullable=False, default=17)
    fecha = Column(DateTime)
    subtotal = Column(Numeric(14, 2), default=0)
    total_iva = Column(Numeric(14, 2), default=0)
    total_impoconsumo = Column(Numeric(14, 2), default=0)
    total_ipc = Column(Numeric(14, 2), default=0)
    total_ibua = Column(Numeric(14, 2), default=0)
    total_icui = Column(Numeric(14, 2), default=0)
    total = Column(Numeric(14, 2), default=0)

    bodega_origen = relationship('Bodegas', foreign_keys=[IdBodegaOrigen])
    bodega_destino = relationship('Bodegas', foreign_keys=[IdBodegaDestino])
    usuario = relationship('Usuarios', backref='traslados1')

class Traslados2(db.Model):
    __tablename__ = 'Traslados2'
    ID = Column(String(25), primary_key=True)
    Numero = Column(String(15), ForeignKey('Traslados1.Numero'), nullable=False)
    IdReferencia = Column(String(50), ForeignKey('referencias.IdReferencia'), nullable=False)
    Descripcion = Column(String(500), nullable=False)
    Cantidad = Column(Numeric(14, 2), nullable=False)
    Valor = Column(Numeric(14, 2), default=0)
    IVA = Column(Numeric(8, 2), nullable=False, default=0)
    Descuento = Column(Numeric(14, 2), default=0)
    idfuente = Column(String(50))
    numerofuente = Column(String(50))
    loteorigen = Column(Text)
    lotedestino = Column(Text)
    idunidad = Column(Text)
    impoconsumo = Column(Numeric(14, 2), default=0)
    ipc = Column(Numeric(14, 2), default=0)
    imp_ibua = Column(Numeric(14, 2), default=0)
    imp_icui = Column(Numeric(14, 2), default=0)

    traslado1 = relationship('Traslados1', backref='traslados2')
    referencia = relationship('Referencia', backref='traslados2')

class SaldosBodega(db.Model):
    __tablename__ = 'SaldosBodega'
    IdBodega = Column(String(20), ForeignKey('Bodegas.IdBodega'), primary_key=True)
    Mes = Column(String(6), primary_key=True)
    IdReferencia = Column(String(50), ForeignKey('referencias.IdReferencia'), primary_key=True)
    SaldoInicial = Column(Numeric(20, 2), default=0)
    Ventas = Column(Numeric(20, 2), default=0)
    Compras = Column(Numeric(20, 2), default=0)
    Entradas = Column(Numeric(20, 2), default=0)
    Salidas = Column(Numeric(20, 2), default=0)
    Saldo = Column(Numeric(20, 2), default=0)  # Nueva columna
    costoponderado = Column(Numeric(14, 5), default=0)
    lote = Column(Text, nullable=True)  # Cambiado a nullable=True

    bodega = relationship('Bodegas', back_populates='saldos')
    referencia = relationship('Referencia', back_populates='saldos')

class Referencia(db.Model):
    __tablename__ = 'referencias'
    IdReferencia = db.Column(db.String(50), primary_key=True, nullable=False)
    Referencia = Column(String(500), nullable=False)
    IdGrupo = Column(String(10), ForeignKey('Grupos.IdGrupo'), nullable=False)
    IdUnidad = Column(String(10), ForeignKey('Unidades.IdUnidad'), nullable=False)
    StockMinimo = Column(Numeric(14, 2), default=0)
    StockMaximo = Column(Numeric(14, 2), default=0)
    Ubicacion = Column(String(30))
    IdCentroCosto = Column(String(10))
    FechaCreacion = Column(DateTime, nullable=False, default=datetime.utcnow)
    Estado = Column(Boolean, nullable=False, default=True)
    Tipo = Column(Boolean, nullable=False, default=False)
    ReferenciaProveedor = Column(String(500))
    Costo = Column(Numeric(14, 2), default=0)
    PrecioVenta1 = Column(Numeric(14, 2), default=0)
    SaldoAntesInv = Column(Numeric(20, 5), default=0)
    Insumo = Column(Boolean, nullable=False, default=False)
    IdConceptoContable = Column(String(20))
    ManejaInventario = Column(Boolean, nullable=False, default=False)
    atributada = Column(Boolean)
    idsubgrupo = Column(String(10), ForeignKey('SubGrupos.IdSubgrupo'))
    idlinea = Column(String(2))
    presentacion = Column(Boolean)
    IdUnidadpcc = Column(String(10))
    porcpreciov1 = Column(Float)
    tipocosto = Column(String(2))
    calcularprecioventa = Column(Boolean)
    Marca = Column(String(50))
    Talla = Column(String(10))
    GENERAL = Column(String(50))
    modelos = Column(String(500))
    manejaseriales = Column(Boolean)
    metalcontrolado = Column(Boolean)
    ALMACENAMIENTO = Column(String(50))
    TIPOS = Column(String(50))
    idgrupocaracteristica = Column(String(10))
    productoagotado = Column(Boolean)
    ordengrupo = Column(Integer)
    numtoques = Column(Integer)
    modificaprecio = Column(Boolean)
    costoreal = Column(Numeric(14, 2), default=0)
    fechavencimiento = Column(DateTime)
    idbodega = Column(Text)
    idsubcategoria = Column(Text, ForeignKey('subcategorias.idsubcategoria'))
    EstadoProducto = Column(String(20))
    IVA = Column(Numeric(4, 2), default=0)

    grupo = relationship('Grupo', backref='referencias')
    saldos = relationship('SaldosBodega', back_populates='referencia')
    subgrupo = relationship('SubGrupos', backref='referencias')
    subcategoria = relationship('Subcategorias', backref='referencias')
    unidad = relationship('Unidades', backref='referencias')
    EstadoProducto = Column(String(20), ForeignKey('EstadoProducto.IdEstadoProducto'))
    estado_producto = relationship('EstadoProducto')

class Proveedores(db.Model):
    __tablename__ = 'Proveedores'
    Nit = Column(String(50), primary_key=True)
    RazonSocial = Column(String(100), nullable=False)
    Contacto1 = Column(String(50))
    Direccion = Column(String(100))
    Telefono1 = Column(String(50))
    IdCiudad = Column(String(10))
    Autoretenedor = Column(Boolean)
    RS = Column(Boolean)
    Actividad = Column(String(20))
    Nombre1 = Column(String(50))
    Nombre2 = Column(String(50))
    Apellido1 = Column(String(50))
    Apellido2 = Column(String(50))
    IdBanco = Column(String(10))
    Numero = Column(String(50))
    Cuenta = Column(String(50))
    Telefono2 = Column(String(50))
    Telefono3 = Column(String(50))
    Fax = Column(String(50))
    Celular = Column(String(50))
    Email = Column(String(50))
    Contacto2 = Column(String(50))
    Contacto3 = Column(String(50))
    Estado = Column(Boolean, nullable=False, default=True)
    DiasCredito = Column(Integer)
    IdDepartamento = Column(String(5))
    IdTipoTercero = Column(String(5))
    CxP = Column(String(20))
    DV = Column(String(1))
    retefuente = Column(Boolean)
    clasificacion = Column(Integer)
    consignacion = Column(Boolean)
    tipo = Column(String(2))
    IdActividadEconomica = Column(String(20))
    aplicareteica = Column(Boolean)
    fechacreacion = Column(DateTime)

    def __repr__(self):
        return f"<Proveedor(Nit='{self.Nit}', RazonSocial='{self.RazonSocial}')>"

class Unidades(db.Model):
    __tablename__ = 'Unidades'
    IdUnidad = Column(String(10), primary_key=True)
    Unidad = Column(String(50), nullable=False)
    Estado = Column(Boolean, default=True)

class SubGrupos(db.Model):
    __tablename__ = 'SubGrupos'
    IdSubgrupo = Column(String(10), primary_key=True)
    Subgrupo = Column(String(50), nullable=False)
    IdGrupo = Column(String(10), ForeignKey('Grupos.IdGrupo'), nullable=False)
    Estado = Column(Boolean, nullable=False, default=True)

    grupo = relationship('Grupo', backref='subgrupos')

class Subcategorias(db.Model):
    __tablename__ = 'subcategorias'
    idsubcategoria = Column(Text, primary_key=True)
    categoria = Column(Text)
    idgrupo = Column(Text, ForeignKey('Grupos.IdGrupo'))
    idsubgrupo = Column(Text, ForeignKey('SubGrupos.IdSubgrupo'))
    estado = Column(Boolean)

    grupo = relationship('Grupo', backref='subcategorias')
    subgrupo = relationship('SubGrupos', backref='subcategorias')

class Grupo(db.Model):
    __tablename__ = 'Grupos'
    IdGrupo = Column(String(10), primary_key=True)
    Grupo = Column(String(50), nullable=False)
    Estado = Column(Boolean, nullable=False)
    inventario = Column(Text)
    menupos = Column(Boolean, default=None)
    ultimoCodigo = db.Column(db.Integer, default=0)  # Nuevo campo

class EstadoProducto(db.Model):
    __tablename__ = 'EstadoProducto'
    IdEstadoProducto = Column(String(10), primary_key=True)
    EstadoProducto = Column(String(50), nullable=False)
    Estado = Column(Boolean, nullable=False)    

class OrdenesCompra1(db.Model):
    __tablename__ = 'OrdenesCompra1'
    Numero = Column(String(20), primary_key=True)
    Mes = Column(String(6), nullable=False)
    Anulado = Column(Boolean, nullable=False, default=False)
    Nit = Column(String(50), ForeignKey('Proveedores.Nit'), nullable=False)
    Descuento = Column(Numeric(14, 2), nullable=False, default=0)
    IdMontajeSolicitud = Column(String(20))
    FechaCreacion = Column(DateTime, nullable=False)
    IdUsuario = Column(String(15), ForeignKey('Usuarios.IdUsuario'), nullable=False)
    Observaciones = Column(String(500))
    OrdenCompletada = Column(Boolean, nullable=False, default=False)
    IdBodega = Column(String(20), ForeignKey('Bodegas.IdBodega'))
    fechamodificacion = Column(DateTime)
    moneda = Column(Integer)
    tasacambio = Column(Float)
    IdConsecutivo = Column(Integer, nullable=False, default=20)
    IdCentroCosto = Column(String(10))
    Solicita = Column(String(100))
    Aprueba = Column(String(100))
    aprobadoworkflow = Column(Boolean)
    nivelworkflow = Column(Integer)
    workflow = Column(Integer)

    usuario = relationship('Usuarios', backref='ordenes_compra1')
    proveedor = relationship('Proveedores', backref='ordenes_compra1')
    bodega = relationship('Bodegas', backref='ordenes_compra1')

class OrdenesCompra2(db.Model):
    __tablename__ = 'OrdenesCompra2'
    ID = Column(String(25), primary_key=True)
    Numero = Column(String(20), ForeignKey('OrdenesCompra1.Numero'), nullable=False)
    IdReferencia = Column(String(50), ForeignKey('referencias.IdReferencia'), nullable=False)
    Descripcion = Column(String(500), nullable=False)
    CantidadPedida = Column(Numeric(14, 2), nullable=False, default=0)
    CantidadEntregada = Column(Numeric(14, 2), nullable=False, default=0)
    Valor = Column(Numeric(14, 2), nullable=False, default=0)
    Descuento = Column(Numeric(5, 2), nullable=False, default=0)
    Iva = Column(Numeric(5, 2), nullable=False, default=0)
    CantidadTotal = Column(Numeric(14, 2), nullable=False, default=0)
    IdCentroCosto = Column(String(10))
    aprobadoworkflow = Column(Integer)
    apruebaworkflow = Column(Boolean)
    cantidadinicial = Column(Numeric(14, 2))
    ultimogrupoaprueba = Column(Integer)
    idunidad = Column(String(10), ForeignKey('Unidades.IdUnidad'))

    orden_compra1 = relationship('OrdenesCompra1', backref='ordenes_compra2')
    referencia = relationship('Referencia', backref='ordenes_compra2')
    unidad = relationship('Unidades', backref='ordenes_compra2')

class Bancos(db.Model):
    __tablename__ = 'Bancos'
    
    IdBanco = Column(String(10), primary_key=True)
    Banco = Column(String(50), nullable=False)
    Estado = Column(Boolean, nullable=False, default=True)
    cuenta = Column(String(50))
    tipo = Column(Text)
    cuentacontable = Column(Text)
    chequeactual = Column(Text)
    chequefinal = Column(Text)
    escheque = Column(Boolean)
    tipocuenta = Column(Text)

    def __repr__(self):
        return f'<Banco {self.IdBanco}>'

class Usuarios(db.Model):
    __tablename__ = 'Usuarios'
    
    # Campos existentes
    IdUsuario = Column(String(15), primary_key=True)
    Contraseña = Column(String(255), nullable=False)
    Descripcion = Column(String(100), nullable=False)
    Estado = Column(Boolean, nullable=False, default=True)
    NivelAcceso = Column(Integer, nullable=False, default=0)
    email = Column(String(50))
    
    # Nuevos campos de control de acceso
    superUsuario = Column(Boolean, default=False)
    
    # Permisos de módulos
    permiso_usuarios = Column(Boolean, default=False)
    permiso_configuracion = Column(Boolean, default=False)
    permiso_maestros = Column(Boolean, default=False)
    permiso_inventario = Column(Boolean, default=False)
    
    # Visibilidad de módulos
    ocultar_traslados = Column(Boolean, default=False)
    ocultar_entradas = Column(Boolean, default=False)
    ocultar_salidas = Column(Boolean, default=False)
    ocultar_compras = Column(Boolean, default=False)
    ocultar_ordenes = Column(Boolean, default=False)
    
    # Permisos específicos
    puede_anular = Column(Boolean, default=False)
    puede_modificar = Column(Boolean, default=False)
    puede_eliminar = Column(Boolean, default=False)
    puede_exportar = Column(Boolean, default=False)
    
    # Restricciones de datos
    ver_costos = Column(Boolean, default=False)
    ver_precios = Column(Boolean, default=False)
    ver_inventario = Column(Boolean, default=False)
    
    # Campo para la bodega predeterminada
    idbodega = Column(String(20), ForeignKey('Bodegas.IdBodega'))
    
    # Campos de auditoría
    fecha_creacion = Column(DateTime, default=func.now())
    ultima_modificacion = Column(DateTime, onupdate=func.now())
    ultimo_acceso = Column(DateTime)
    
    # Relaciones
    bodega = relationship('Bodegas', backref='usuarios')

    def set_password(self, password):
        self.Contraseña = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.Contraseña, password)

    def is_super_user(self):
        return self.superUsuario

    def to_dict(self):
        return {
            'IdUsuario': self.IdUsuario,
            'Descripcion': self.Descripcion,
            'Estado': self.Estado,
            'NivelAcceso': self.NivelAcceso,
            'email': self.email,
            'superUsuario': self.superUsuario,
            'permiso_usuarios': self.permiso_usuarios,
            'permiso_configuracion': self.permiso_configuracion,
            'permiso_maestros': self.permiso_maestros,
            'permiso_inventario': self.permiso_inventario,
            'ocultar_traslados': self.ocultar_traslados,
            'ocultar_entradas': self.ocultar_entradas,
            'ocultar_salidas': self.ocultar_salidas,
            'ocultar_compras': self.ocultar_compras,
            'ocultar_ordenes': self.ocultar_ordenes,
            'puede_anular': self.puede_anular,
            'puede_modificar': self.puede_modificar,
            'puede_eliminar': self.puede_eliminar,
            'puede_exportar': self.puede_exportar,
            'ver_costos': self.ver_costos,
            'ver_precios': self.ver_precios,
            'ver_inventario': self.ver_inventario,
            'idbodega': self.idbodega
        }

class Compras1(db.Model):
    __tablename__ = 'Compras1'
    Numero = Column(String(50), primary_key=True)
    Mes = Column(String(6), nullable=False)
    Anulado = Column(Boolean, nullable=False)
    Fecha = Column(DateTime, nullable=False)
    FechaCreacion = Column(DateTime, nullable=False)
    fechamodificacion = Column(DateTime, nullable=False)
    Observaciones = Column(String(500))
    IdUsuario = Column(String(15), ForeignKey('Usuarios.IdUsuario'), nullable=False)
    IdBodega = Column(String(20), ForeignKey('Bodegas.IdBodega'), nullable=False)
    Nit = Column(String(50), ForeignKey('Proveedores.Nit'), nullable=False)
    NumFactura = Column(String(50), nullable=False)
    IdCentroCosto = Column(String(10))
    IdConsecutivo = Column(Integer, nullable=False, default=19)
    idimpuesto = Column(String(10))
    descuento = Column(Numeric(14, 2))
    porcretefuente = Column(Numeric(5, 2))
    retefuente = Column(Numeric(14, 2))
    reteica = Column(Numeric(14, 2))
    reteiva = Column(Numeric(14, 2))
    total = Column(Numeric(14, 2))
    totaliva = Column(Numeric(14, 2))
    documento1 = Column(Text)
    cantidadmetaldisponible = Column(Numeric(18, 2))
    totalcantidadmetal = Column(Numeric(18, 2))
    topemaximo = Column(Numeric(14, 2))
    acumulado = Column(Numeric(14, 2))
    totalcompras = Column(Numeric(14, 2))
    flete = Column(Numeric(14, 0))
    tipoempresa = Column(String(2))
    tipoproveedor = Column(String(2))
    calculareteiva = Column(Boolean)
    calculareteica = Column(Boolean)
    porcuotas = Column(Boolean)
    subtotal = Column(Numeric(14, 2), default=0)
    totaldescuento = Column(Numeric(14, 2), default=0)
    valorindustriacomercio = Column(Numeric(14, 2), default=0)
    transmitido = Column(Boolean)
    totalipc = Column(Numeric(14, 2), default=0)
    total_ibua = Column(Numeric(14, 2), default=0)
    total_icui = Column(Numeric(14, 2), default=0)

    # Relaciones
    usuario = relationship('Usuarios', backref='compras1')
    bodega = relationship('Bodegas', backref='compras1')
    proveedor = relationship('Proveedores', backref='compras1')
    detalles = relationship('Compras2', backref='compra1', cascade='all, delete-orphan')

class Compras2(db.Model):
    __tablename__ = 'Compras2'
    ID = Column(String(25), primary_key=True)
    Numero = Column(String(50), ForeignKey('Compras1.Numero'), nullable=False)
    IdReferencia = Column(String(50), ForeignKey('referencias.IdReferencia'), nullable=False)
    Descripcion = Column(String(500), nullable=False)
    Cantidad = Column(Numeric(14, 2), nullable=False)
    Valor = Column(Numeric(14, 2), nullable=False)
    IVA = Column(Numeric(8, 2), nullable=False)
    Descuento = Column(Numeric(14, 2), nullable=False)
    NumOrdenCompra = Column(String(20))
    NumEntradaCia = Column(String(20))
    idfuente = Column(String(25))
    IdCentroCosto = Column(String(10))
    precioventa1 = Column(Numeric(14, 2))
    descuentounitario = Column(Numeric(14, 2))
    margen = Column(Numeric(5, 2))
    ley = Column(Numeric(14, 2))
    peso = Column(Numeric(14, 2))
    tipo = Column(Boolean)
    lote = Column(Text)
    idunidad = Column(Text)
    ipc = Column(Numeric(14, 2), default=0)
    imp_ibua = Column(Numeric(14, 2), default=0)
    imp_icui = Column(Numeric(14, 2), default=0)

    # Relaciones
    referencia = relationship('Referencia', backref='compras2')

class CentroCostos(db.Model):
    __tablename__ = 'CentroCostos'
    IdCentroCosto = db.Column(db.String(10), primary_key=True, nullable=False)
    CentroCosto = db.Column(db.String(50), nullable=False)
    IdPadre = db.Column(db.String(10), nullable=True)
    Estado = db.Column(db.Boolean, nullable=True)
    CostoManoObra = db.Column(db.Float(20, 5), nullable=False)

    def __repr__(self):
        return f'<CentroCostos {self.IdCentroCosto}>'

# Añadir índices para mejorar el rendimiento
db.Index('idx_entradas1_idbodega', Entradas1.IdBodega)
db.Index('idx_entradas2_idreferencia', Entradas2.IdReferencia)
db.Index('idx_salidas1_idbodega', Salidas1.IdBodega)
db.Index('idx_salidas2_idreferencia', Salidas2.IdReferencia)
db.Index('idx_traslados1_idbodegaorigen', Traslados1.IdBodegaOrigen)
db.Index('idx_traslados1_idbodegadestino', Traslados1.IdBodegaDestino)
db.Index('idx_traslados2_idreferencia', Traslados2.IdReferencia)
db.Index('idx_saldosbodega_idreferencia', SaldosBodega.IdReferencia)
db.Index('idx_referencia_idgrupo', Referencia.IdGrupo)
db.Index('idx_subgrupos_idgrupo', SubGrupos.IdGrupo)
db.Index('idx_subcategorias_idgrupo', Subcategorias.idgrupo)
db.Index('idx_subcategorias_idsubgrupo', Subcategorias.idsubgrupo)
db.Index('idx_compras1_idbodega', Compras1.IdBodega)
db.Index('idx_compras1_nit', Compras1.Nit)
db.Index('idx_compras2_numero', Compras2.Numero)
db.Index('idx_compras2_idreferencia', Compras2.IdReferencia)

def init_app(app):
    db.init_app(app)
    with app.app_context():
        db.create_all()

# Funciones auxiliares para operaciones comunes

def actualizar_saldo_bodega(id_bodega, id_referencia, cantidad, tipo_movimiento):
    """
    Actualiza el saldo de una referencia en una bodega específica.
    tipo_movimiento puede ser 'entrada', 'salida', 'venta', o 'compra'
    """
    mes_actual = datetime.now().strftime('%Y%m')
    saldo = SaldosBodega.query.filter_by(
        IdBodega=id_bodega, 
        IdReferencia=id_referencia, 
        Mes=mes_actual
    ).first()

    if not saldo:
        saldo = SaldosBodega(
            IdBodega=id_bodega,
            IdReferencia=id_referencia,
            Mes=mes_actual,
            SaldoInicial=0,
            Ventas=0,
            Compras=0,
            Entradas=0,
            Salidas=0
        )
        db.session.add(saldo)

    if tipo_movimiento == 'entrada':
        saldo.Entradas += cantidad
    elif tipo_movimiento == 'salida':
        saldo.Salidas += cantidad
    elif tipo_movimiento == 'venta':
        saldo.Ventas += cantidad
    elif tipo_movimiento == 'compra':
        saldo.Compras += cantidad

    db.session.commit()

def obtener_saldo_actual(id_bodega, id_referencia):
    """
    Obtiene el saldo actual de una referencia en una bodega específica
    """
    mes_actual = datetime.now().strftime('%Y%m')
    saldo = SaldosBodega.query.filter_by(
        IdBodega=id_bodega, 
        IdReferencia=id_referencia, 
        Mes=mes_actual
    ).first()

    if saldo:
        return (saldo.SaldoInicial + saldo.Entradas + saldo.Compras - 
                saldo.Salidas - saldo.Ventas)
    return 0

def registrar_movimiento(modelo, datos):
    """
    Registra un movimiento (entrada, salida, traslado) en la base de datos
    """
    nuevo_movimiento = modelo(**datos)
    db.session.add(nuevo_movimiento)
    db.session.commit()
    return nuevo_movimiento